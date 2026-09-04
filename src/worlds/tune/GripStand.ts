import * as THREE from 'three';
import { GhostHand } from '../../core/HandVisuals';
import { createTool } from '../portal/tools';
import { StandFrame } from './StandFrame';
import { DEFAULT_GRIP, clampGrip, type GripSettings } from './gripSettings';
import type { HandPose } from '../../core/handPose';
import type { Handedness } from '../../core/XRInput';
import type { Tool } from '../portal/tools/Tool';

/** Wie weit der Ausleger mit den Griffen zur Seite steht — nach rechts. */
const BOOM = -0.45;

/** Wie nah eine Hand an die Boxhand muss, um sie zu nehmen. */
export const HAND_REACH = 0.16;

const _world = new THREE.Vector3();

/**
 * Der **zweite** Justierstand: wie umfasst die Hand den Gegenstand?
 *
 * Der erste Stand misst die echte Hand gegen ein Werkzeug und schreibt daraus,
 * *wie das Werkzeug im Griff liegt*. Das ist die Zielrichtung, und die stimmt
 * danach. Wie die **gezeichnete** Hand dabei aussieht, steht damit aber noch
 * nicht fest — und es ist auch nicht dasselbe: an einer Pistole zeigt der
 * Zeigefinger dorthin, wohin der Lauf zeigt, an einer Taschenlampe zeigt
 * dieselbe Haltung schräg in die Luft, weil deren Kegel dort hinausgeht, wo
 * bei der Pistole der Lauf sitzt.
 *
 * Also hier die zweite Hälfte, und sie ist bewusst **anders herum bedienbar**:
 *
 * - Die **Kopie des Werkzeugs** hängt fest. Man kann sie nicht nehmen, nicht
 *   schieben und nicht einrasten lassen — sie ist der feste Punkt, gegen den
 *   gemessen wird, und ein fester Punkt, den man versehentlich mitnimmt, ist
 *   keiner. Sie kommt aus `createTool`, ist also dieselbe Geometrie in
 *   derselben Lage wie das echte Werkzeug, gehört aber niemandem.
 * - Die **Boxhand** daran lässt sich greifen, drehen, verschieben und wieder
 *   loslassen. Wo sie beim Loslassen liegt, *ist* die Haltung.
 *
 * Die Boxhand hängt dabei als **Kind der Kopie**. Das ist keine Kleinigkeit,
 * sondern die ganze Rechnung: ihre Lage in diesem Elternteil ist genau die
 * Größe, die gespeichert wird (`handGrip.ts`), und ein Stand, den man
 * hinterher noch verschiebt, nimmt beide gemeinsam mit, ohne dass sich an der
 * Messung etwas ändert.
 *
 * Gestell, Säule und die beiden Griffe am Ausleger kommen von `StandFrame` —
 * dieselben wie am ersten Stand, damit man nicht zweimal lernt, wie ein Stand
 * verschoben wird.
 */
export class GripStand extends StandFrame {
  /**
   * Wohin ein Knopf gehört, der zu diesem Stand gehört: **darunter**, und zum
   * Spieler gedreht. Er wandert mit dem Stand, weil man ihn dort drückt, wo man
   * ohnehin steht.
   */
  readonly panel = new THREE.Object3D();

  private piece: Tool | null = null;
  private copyId = '';
  private ghost: GhostHand | null = null;
  private ghostKey = '';
  private settings: GripSettings = clampGrip({});

  constructor() {
    super('grip-stand', BOOM, DEFAULT_GRIP.x / 100);
    // Ein kleiner Teller unter der Kopie: irgendetwas muss sagen, dass hier
    // ein Stand ist und nicht ein Werkzeug in der Luft hängt.
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.02, 20),
      this.standMaterial,
    );
    plate.position.y = -0.06;
    this.station.add(plate);
    // Eine halbe Armlänge unter der Kopie und zum Eingang gedreht: dort schaut
    // hin, wer vor dem Stand steht und die Boxhand ansieht.
    // Vor die Säule, nicht in sie hinein: ein Knopf mit einem Pfosten mitten
    // durchs Schild ist schwer zu treffen und noch schwerer zu lesen.
    this.panel.position.set(0, -0.42, -0.14);
    this.panel.rotation.y = Math.PI;
    this.station.add(this.panel);
    this.apply(this.settings);
  }

  /** Wo der Stand steht und wie hoch — der eine Weg dorthin. */
  apply(settings: GripSettings): void {
    this.settings = settings;
    this.place(settings.height / 100, settings.x / 100, settings.z / 100);
  }

  /** Die Kopie, die dort hängt — `null`, solange keine gebaut ist. */
  get tool(): Tool | null {
    return this.piece;
  }

  /** Die Boxhand — das Einzige hier, was eine Hand mitnehmen darf. */
  get handObject(): GhostHand | null {
    return this.ghost;
  }

  /**
   * Welches Werkzeug dort liegt. Gebaut wird nur, wenn sich wirklich etwas
   * geändert hat: ein Werkzeug neu zu bauen heißt, seine Leinwände neu zu
   * bauen, und das mitten in einer Messung.
   */
  setTool(id: string): Tool | null {
    if (id === this.copyId && this.piece) return this.piece;
    this.copyId = id;
    const previous = this.piece;
    this.piece = null;
    previous?.removeFromParent();
    previous?.disposeTool();
    const copy = createTool(id);
    if (!copy) return null;
    // Es hängt in der Aufnahme und wird nie gehalten: keine Zielkorrektur,
    // keine Physik, kein Gürtel. Die Lage im Griff steht am echten Werkzeug
    // und wird von der Welt hereingereicht, wenn sie die Hand hinstellt.
    copy.position.set(0, 0, 0);
    copy.quaternion.identity();
    this.mount.add(copy);
    this.piece = copy;
    // Die Hand gehört ans neue Werkzeug — die alte hing an der alten Kopie.
    this.ghost?.dispose();
    this.ghost = null;
    this.ghostKey = '';
    return copy;
  }

  /**
   * Die Boxhand: dieselbe Seite und dieselbe Krümmung, in der die Hand das
   * Werkzeug wirklich hält.
   *
   * Gebaut wird sie nur neu, wenn sich etwas geändert hat — eine `GhostHand`
   * friert ihre Finger beim Bauen ein, und niemand will einem Geist beim
   * Hineinwachsen zusehen.
   *
   * @returns die Hand, damit die Welt sie gleich an ihren Platz stellen kann.
   */
  setHand(side: Handedness, pose: HandPose): GhostHand | null {
    if (!this.piece) return null;
    const key = `${side}:${JSON.stringify(pose)}`;
    if (key === this.ghostKey && this.ghost) return this.ghost;
    this.ghostKey = key;
    this.ghost?.dispose();
    // **Fest**, nicht gläsern: hier steht kein Geist neben der eigenen Hand,
    // hier umfasst eine Boxhand ein Werkzeug, und man will sehen, wie.
    const ghost = new GhostHand(side, pose, { color: 0x9fe3ff, opacity: 0.92 });
    // Kind der Kopie: ihre Lage darin ist die Haltung, und ein verschobener
    // Stand ändert daran nichts.
    this.piece.add(ghost);
    this.ghost = ghost;
    return ghost;
  }

  /** Die Boxhand zurück ans Werkzeug hängen — nach dem Ziehen an einer Hand. */
  reclaim(): void {
    const ghost = this.ghost;
    if (!ghost || !this.piece) return;
    // `attach` behält die Weltlage bei und rechnet die Ortslage neu — genau
    // das, was nach dem Loslassen gebraucht wird.
    this.piece.attach(ghost);
  }

  /** Wie weit ein Punkt von der Boxhand weg ist, in Metern. */
  handDistance(worldPoint: THREE.Vector3): number {
    const ghost = this.ghost;
    if (!ghost) return Infinity;
    ghost.updateWorldMatrix(true, false);
    return ghost.getWorldPosition(_world).distanceTo(worldPoint);
  }

  override setGlow(what: string | null): void {
    if (what === this.lit) return;
    super.setGlow(what);
    this.setStandGlow(what === 'hand');
  }

  dispose(): void {
    this.ghost?.dispose();
    this.ghost = null;
    const copy = this.piece;
    this.piece = null;
    copy?.removeFromParent();
    copy?.disposeTool();
    this.disposeFrame();
  }
}
