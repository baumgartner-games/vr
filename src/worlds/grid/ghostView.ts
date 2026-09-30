import * as THREE from 'three';
import { fadeInfoMaterial } from '../../core/infoViewScene';
import { infoView } from '../../core/infoViews';
import type { GhostBox } from './wallGhost';

/**
 * **Was das Ghosting sieht** — die Kästen, über die es entscheidet, als
 * Drahtgitter über der Welt (_Menü → Grafik → Ghosting zeigen_,
 * `GraphicsSettings.ghostBoxes`).
 *
 * Gewünscht mit genau diesem Zweck: „hier wäre bei Grafik Option gut, wenn wir
 * sehen könnten, welche Box/Felder unsichtbar werden sollen, um diesem Bug
 * entgegenzuwirken." Das Ghosting ist eine Rechnung über Kästen
 * (`roomWalls.roomWallsToClear`), und ein Fehler darin sieht im Bild immer gleich
 * aus — die falsche Wand wird durchsichtig. **Welcher** Fehler es war, sagt
 * erst der Kasten: ob er zu breit ist, ob er gar nicht in der Liste steht,
 * oder ob die Rechnung von der falschen Stelle aus fragt.
 *
 * Zwei Farben, und jede ist eine Antwort:
 *
 * - **Gelb** — ein Kasten, der verdecken **könnte** (`wallGhost.blocksView`),
 *   es in diesem Bild aber nicht tut.
 * - **Rot** — was gerade durchsichtig oder abgeschnitten ist.
 *
 * Bis Ende September 2026 lag daneben ein weißer Streifen: die Spalte der Figur, in
 * der die Sichtlinie fragte. Die Sichtlinie ist weg (`roomWalls.ts`), der
 * Streifen mit ihr.
 *
 * Wie die Hitboxen **ohne Tiefenprüfung**: Ein Kasten, den die Wand verdeckt,
 * zu der er gehört, beantwortet keine Frage. Und nur die Kästen in der Nähe
 * (`GHOST_VIEW_REACH`) — ein Gelände voller gelber Drahtgitter ist ein
 * Teppich, in dem man den roten nicht wiederfindet.
 */

/** Bis zu welcher Entfernung von der Figur Kästen gezeichnet werden, in Metern. */
export const GHOST_VIEW_REACH = 14;

const COLOR_IDLE = new THREE.Color(0xffd23f);
const COLOR_HIDDEN = new THREE.Color(0xff3b3b);

/** Ein Kasten und ob er gerade durchsichtig ist. */
export interface GhostBoxLine {
  readonly box: GhostBox;
  readonly hidden: boolean;
}

/** Zwölf Kanten je Kasten, zwei Punkte je Kante. */
const BOX_POINTS = 24;

export class GhostBoxView {
  private lines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private capacity = 0;

  constructor(private readonly parent: THREE.Object3D) {}

  /**
   * **Ein Bild zeichnen**: die Kästen um die Figur.
   *
   * @param aim Die Figur — gezeichnet wird, was höchstens `GHOST_VIEW_REACH`
   *   von ihr weg ist.
   */
  show(aim: { x: number; z: number }, boxes: Iterable<GhostBoxLine>): void {
    // Die Darstellungsoptionen (`core/infoViews.ts`): ohne Wände nichts —
    // die Kästen sind Wände, Massen und Modelle.
    const look = infoView('ghost');
    const near: GhostBoxLine[] = [];
    for (const one of look.walls ? boxes : []) {
      const dx = Math.max(Math.abs(one.box.x - aim.x) - one.box.w / 2, 0);
      const dz = Math.max(Math.abs(one.box.z - aim.z) - one.box.d / 2, 0);
      if (Math.hypot(dx, dz) <= GHOST_VIEW_REACH) near.push(one);
    }
    const count = near.length * BOX_POINTS;
    const lines = this.ensure(count);
    const position = lines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const color = lines.geometry.getAttribute('color') as THREE.BufferAttribute;
    let at = 0;
    const put = (x: number, y: number, z: number, tone: THREE.Color): void => {
      position.setXYZ(at, x, y, z);
      color.setXYZ(at, tone.r, tone.g, tone.b);
      at += 1;
    };
    for (const one of near) {
      const tone = one.hidden ? COLOR_HIDDEN : COLOR_IDLE;
      for (const [a, b] of boxEdges(one.box)) {
        put(a[0], a[1], a[2], tone);
        put(b[0], b[1], b[2], tone);
      }
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
    lines.geometry.setDrawRange(0, at);
    fadeInfoMaterial(lines.material, look.opacity);
    lines.visible = true;
  }

  hide(): void {
    if (this.lines) this.lines.visible = false;
  }

  dispose(): void {
    if (!this.lines) return;
    this.lines.removeFromParent();
    this.lines.geometry.dispose();
    this.lines.material.dispose();
    this.lines = null;
    this.capacity = 0;
  }

  /**
   * Ein Netz, das mindestens `count` Punkte fasst — gewachsen wird in
   * Verdopplungen, damit ein Schritt in einen Raum mit mehr Wänden nicht jedes
   * Bild einen neuen Puffer anlegt.
   */
  private ensure(count: number): THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> {
    if (this.lines && this.capacity >= count) return this.lines;
    const capacity = Math.max(256, 2 ** Math.ceil(Math.log2(count)));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
    if (this.lines) {
      this.lines.geometry.dispose();
      this.lines.geometry = geometry;
    } else {
      const skin = new THREE.LineBasicMaterial({
        vertexColors: true,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      this.lines = new THREE.LineSegments(geometry, skin);
      this.lines.name = 'ghost-view';
      // Über allem und nie weggesiebt: Die Hülle des Netzes wird nicht jedes
      // Bild nachgerechnet, und ein Gitter, das beim Umdrehen verschwindet,
      // zeigt einen Fehler, den es nicht gibt.
      this.lines.renderOrder = 999;
      this.lines.frustumCulled = false;
      this.parent.add(this.lines);
    }
    this.capacity = capacity;
    return this.lines;
  }
}

type Point = [number, number, number];

/** Die zwölf Kanten eines Kastens. */
function boxEdges(box: GhostBox): [Point, Point][] {
  const x = [box.x - box.w / 2, box.x + box.w / 2];
  const y = [box.y - box.h / 2, box.y + box.h / 2];
  const z = [box.z - box.d / 2, box.z + box.d / 2];
  const corner = (i: number, j: number, k: number): Point => [x[i]!, y[j]!, z[k]!];
  const out: [Point, Point][] = [];
  for (const j of [0, 1]) {
    for (const k of [0, 1]) out.push([corner(0, j, k), corner(1, j, k)]);
    for (const i of [0, 1]) out.push([corner(i, j, 0), corner(i, j, 1)]);
  }
  for (const i of [0, 1]) for (const k of [0, 1]) out.push([corner(i, 0, k), corner(i, 1, k)]);
  return out;
}
